import { Chess, type Square } from 'chess.js'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { describeMove } from '../core/analysis/explainMove'
import { cheapestCapturer, hangingPieces } from '../core/analysis/hanging'
import type { Color } from '../core/games/model'
import {
  buildOpeningSteps,
  buildWhatIfSteps,
  OPENING_GUIDES,
  openingLineKey,
  whatIfStartFen,
  type BilingualText,
  type OpeningGuide,
  type WhatIfKind,
  type WhatIfScenario,
  type WhatIfStep,
} from '../core/openings/guides'
import { recordActivity } from '../db/daily'
import { getOpeningProgress, markOpeningLineDone, type OpeningProgress } from '../db/openings'
import { getLanguage, t } from '../i18n'
import { ProgressBar } from './analysis'
import { formatMoveBadge, formatThreatSentence } from './moveText'
import { playMoveSan, playSound } from './sound'
import { useBoardColors } from './theme'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const SELECTED_STYLE: CSSProperties = { backgroundColor: 'rgba(250, 204, 21, 0.55)' }
const LAST_MOVE_STYLE: CSSProperties = { backgroundColor: 'rgba(250, 204, 21, 0.35)' }
const TARGET_STYLE: CSSProperties = {
  background: 'radial-gradient(circle, rgba(15, 23, 42, 0.35) 22%, transparent 24%)',
}
const ARROW_GUIDE = 'rgba(16, 185, 129, 0.9)'
const ARROW_WHATIF: Record<WhatIfKind, string> = {
  punish: 'rgba(16, 185, 129, 0.92)',
  danger: 'rgba(244, 63, 94, 0.92)',
  exchange: 'rgba(245, 158, 11, 0.92)',
  deviation: 'rgba(56, 189, 248, 0.92)',
}

const WHATIF_BADGE_STYLES: Record<WhatIfKind, string> = {
  punish: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
  danger: 'border-rose-500/50 bg-rose-500/15 text-rose-300',
  exchange: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
  deviation: 'border-sky-500/50 bg-sky-500/15 text-sky-300',
}

function textOf(b: BilingualText): string {
  return getLanguage() === 'en' ? b.en : b.tr
}

export function OpeningTrainer({
  initialGuideId = null,
  initialLineId = null,
}: {
  initialGuideId?: string | null
  initialLineId?: string | null
}) {
  const [progress, setProgress] = useState<OpeningProgress>({})
  const [guideId, setGuideId] = useState<string | null>(initialGuideId)

  useEffect(() => {
    void getOpeningProgress().then(setProgress)
  }, [])

  const selected = OPENING_GUIDES.find((g) => g.id === guideId) ?? null

  async function onLineComplete(key: string) {
    const updated = await markOpeningLineDone(key)
    setProgress(updated)
    await recordActivity()
  }

  if (selected) {
    return (
      <GuideLesson
        key={selected.id}
        guide={selected}
        initialLineId={guideId === initialGuideId ? initialLineId : null}
        progress={progress}
        onComplete={onLineComplete}
        onBack={() => setGuideId(null)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-300">{t('openings.guide.intro')}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {OPENING_GUIDES.map((guide) => {
          const done = guide.lines.filter((l) => progress[openingLineKey(guide.id, l.id)]).length
          const total = guide.lines.length
          return (
            <li key={guide.id}>
              <button
                type="button"
                onClick={() => setGuideId(guide.id)}
                className="group flex h-full w-full flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-left transition-colors hover:border-emerald-500/50 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                      <span
                        aria-hidden="true"
                        className={`inline-block size-2.5 rounded-sm border border-slate-400 ${
                          guide.color === 'white' ? 'bg-slate-100' : 'bg-slate-950'
                        }`}
                      />
                      {t('openings.guide.playAs', { color: t(`color.${guide.color}`) })}
                    </span>
                    <h2 className="text-base font-semibold text-white group-hover:text-emerald-300">
                      {textOf(guide.name)}
                    </h2>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400"
                  >
                    →
                  </span>
                </div>
                <p className="text-sm text-slate-400">{textOf(guide.tagline)}</p>
                <div className="mt-auto flex flex-col gap-1 pt-1">
                  <p className="text-xs text-slate-400">
                    {t('openings.guide.progress', { done, total })}
                  </p>
                  <ProgressBar value={total > 0 ? done / total : 0} />
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function GuideLesson({
  guide,
  initialLineId,
  progress,
  onComplete,
  onBack,
}: {
  guide: OpeningGuide
  initialLineId?: string | null
  progress: OpeningProgress
  onComplete: (lineKey: string) => Promise<void>
  onBack: () => void
}) {
  const validInitial =
    initialLineId && guide.lines.some((l) => l.id === initialLineId)
      ? initialLineId
      : (guide.lines[0]?.id ?? '')
  const [lineId, setLineId] = useState(validInitial)
  const [mode, setMode] = useState<'learn' | 'practice'>('learn')
  const [runId, setRunId] = useState(0)

  const lineIndex = guide.lines.findIndex((l) => l.id === lineId)
  const nextLine = lineIndex >= 0 ? guide.lines[lineIndex + 1] : undefined

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-emerald-400 hover:underline"
        >
          ← {t('openings.guide.back')}
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-200">
          <span
            aria-hidden="true"
            className={`inline-block size-2.5 rounded-sm border border-slate-400 ${
              guide.color === 'white' ? 'bg-slate-100' : 'bg-slate-950'
            }`}
          />
          {t('openings.guide.playAs', { color: t(`color.${guide.color}`) })}
        </span>
      </div>

      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-white">{textOf(guide.name)}</h2>
        <p className="text-sm text-slate-300">{textOf(guide.tagline)}</p>
      </header>

      {/* Bite-sized intro: Core idea, Strengths, Watch out for */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 text-sm">
          <p className="text-xs font-semibold tracking-wide text-sky-300 uppercase">
            🎯 {t('openings.guide.idea')}
          </p>
          <p className="leading-relaxed text-slate-200">{textOf(guide.idea)}</p>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl border border-emerald-900/60 bg-slate-900/90 p-3.5 text-sm">
          <p className="text-xs font-semibold tracking-wide text-emerald-300 uppercase">
            ✓ {t('openings.guide.pros')}
          </p>
          <ul className="flex flex-col gap-1 text-slate-200">
            {guide.pros.map((item, idx) => (
              <li key={idx}>• {textOf(item)}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl border border-amber-900/60 bg-slate-900/90 p-3.5 text-sm">
          <p className="text-xs font-semibold tracking-wide text-amber-300 uppercase">
            ⚠ {t('openings.guide.cons')}
          </p>
          <ul className="flex flex-col gap-1 text-slate-200">
            {guide.cons.map((item, idx) => (
              <li key={idx}>• {textOf(item)}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Variation selector */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
          {t('openings.guide.variations')}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {guide.lines.map((line) => {
            const active = line.id === lineId
            const done = Boolean(progress[openingLineKey(guide.id, line.id)])
            return (
              <button
                key={line.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setLineId(line.id)
                  setRunId((r) => r + 1)
                }}
                className={`flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? 'border-emerald-500 bg-emerald-600/15 text-white'
                    : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span>{textOf(line.title)}</span>
                  {done && <span className="text-emerald-400">✓</span>}
                </span>
                <span className="text-xs text-slate-400">{textOf(line.when)}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <LineBoard
        key={`${guide.id}:${lineId}:${mode}:${runId}`}
        guide={guide}
        lineId={lineId}
        mode={mode}
        onModeChange={setMode}
        onRestart={() => setRunId((r) => r + 1)}
        onComplete={() => void onComplete(openingLineKey(guide.id, lineId))}
        nextLine={nextLine}
        onNextLine={
          nextLine
            ? () => {
                setLineId(nextLine.id)
                setRunId((r) => r + 1)
              }
            : undefined
        }
      />
    </div>
  )
}

interface ActiveWhatIf {
  scenario: WhatIfScenario
  startFen: string
  steps: WhatIfStep[]
}

function LineBoard({
  guide,
  lineId,
  mode,
  onModeChange,
  onRestart,
  onComplete,
  nextLine,
  onNextLine,
}: {
  guide: OpeningGuide
  lineId: string
  mode: 'learn' | 'practice'
  onModeChange: (mode: 'learn' | 'practice') => void
  onRestart: () => void
  onComplete: () => void
  nextLine: OpeningGuide['lines'][number] | undefined
  onNextLine: (() => void) | undefined
}) {
  const boardColors = useBoardColors()
  const steps = useMemo(() => buildOpeningSteps(guide, lineId), [guide, lineId])
  const [stepIndex, setStepIndex] = useState(0)
  const [selected, setSelected] = useState<Square | null>(null)
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null)
  const [wrongTrySan, setWrongTrySan] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)

  // Live "What if?" board simulation state
  const [activeWhatIf, setActiveWhatIf] = useState<ActiveWhatIf | null>(null)
  const [whatIfPos, setWhatIfPos] = useState(0)
  const [whatIfAuto, setWhatIfAuto] = useState(false)

  const done = stepIndex >= steps.length
  const expected = done ? null : (steps[stepIndex] ?? null)
  const lastStep = stepIndex > 0 ? (steps[stepIndex - 1] ?? null) : null
  const mainFen = lastStep ? lastStep.fenAfter : START_FEN
  const isUserTurn = Boolean(expected?.isUserMove) && !activeWhatIf
  const myPrefix = guide.color === 'white' ? 'w' : 'b'

  // Automatically play the opponent's reply in main line (paused during a what-if simulation).
  useEffect(() => {
    if (activeWhatIf || !expected || expected.isUserMove) return
    const timer = window.setTimeout(() => {
      playMoveSan(expected.san)
      const next = stepIndex + 1
      setStepIndex(next)
      if (next >= steps.length) {
        playSound('correct')
        onComplete()
      }
    }, 480)
    return () => window.clearTimeout(timer)
  }, [activeWhatIf, expected, stepIndex, steps.length, onComplete])

  // Auto-advance the "What if?" scenario so the player watches the consequence unfold live.
  useEffect(() => {
    if (!activeWhatIf || !whatIfAuto) return
    if (whatIfPos >= activeWhatIf.steps.length) return
    const timer = window.setTimeout(() => {
      const next = whatIfPos + 1
      const moveStep = activeWhatIf.steps[next - 1]
      if (moveStep) playMoveSan(moveStep.san)
      setWhatIfPos(next)
      if (next >= activeWhatIf.steps.length) setWhatIfAuto(false)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [activeWhatIf, whatIfAuto, whatIfPos])

  // Scenarios available at the current position (or at the final move once the line is complete).
  const scenarioStepIndex = done ? Math.max(0, steps.length - 1) : stepIndex
  const availableWhatIfs = useMemo(() => {
    const step = steps[scenarioStepIndex]
    return step?.whatIfs ?? []
  }, [steps, scenarioStepIndex])

  // If the user just tried a wrong move that matches a what-if branch, offer a 1-click live demo!
  const matchingWrongScenario = useMemo(() => {
    if (!wrongTrySan) return null
    return (
      availableWhatIfs.find(
        (s) => s.anchor !== 'beforePrev' && s.moves[0]?.san === wrongTrySan,
      ) ?? null
    )
  }, [availableWhatIfs, wrongTrySan])

  function startWhatIf(scenario: WhatIfScenario) {
    const startFen = whatIfStartFen(steps, scenarioStepIndex, scenario)
    const wiSteps = buildWhatIfSteps(startFen, scenario)
    if (wiSteps.length === 0) return
    setSelected(null)
    setActiveWhatIf({ scenario, startFen, steps: wiSteps })
    playMoveSan(wiSteps[0]!.san)
    setWhatIfPos(1)
    setWhatIfAuto(wiSteps.length > 1)
  }

  function closeWhatIf() {
    setActiveWhatIf(null)
    setWhatIfPos(0)
    setWhatIfAuto(false)
  }

  function stepWhatIfTo(pos: number) {
    if (!activeWhatIf) return
    const clamped = Math.max(0, Math.min(pos, activeWhatIf.steps.length))
    setWhatIfAuto(false)
    if (clamped > whatIfPos && activeWhatIf.steps[clamped - 1]) {
      playMoveSan(activeWhatIf.steps[clamped - 1]!.san)
    }
    setWhatIfPos(clamped)
  }

  const activeWhatIfStep =
    activeWhatIf && whatIfPos > 0 ? (activeWhatIf.steps[whatIfPos - 1] ?? null) : null
  const fen = activeWhatIf
    ? activeWhatIfStep
      ? activeWhatIfStep.fenAfter
      : activeWhatIf.startFen
    : mainFen

  const targets = useMemo(() => {
    if (!selected || !isUserTurn) return []
    return new Chess(fen).moves({ square: selected, verbose: true }).map((m) => m.to)
  }, [fen, selected, isUserTurn])

  const expectedDetails = useMemo(
    () => (expected ? describeMove(expected.fenBefore, expected.uci) : null),
    [expected],
  )

  const whatIfMoveDetails = useMemo(
    () => (activeWhatIfStep ? describeMove(activeWhatIfStep.fenBefore, activeWhatIfStep.uci) : null),
    [activeWhatIfStep],
  )

  function tryMove(from: string, to: string): boolean {
    if (!expected || !expected.isUserMove || activeWhatIf) return false
    const chess = new Chess(mainFen)
    let move
    try {
      move = chess.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }
    setSelected(null)
    if (move.from === expected.from && move.to === expected.to) {
      playMoveSan(move.san)
      setWrongFeedback(null)
      setWrongTrySan(null)
      setShowHint(false)
      const next = stepIndex + 1
      setStepIndex(next)
      if (next >= steps.length) {
        playSound('correct')
        onComplete()
      }
      return true
    }
    playSound('wrong')
    setWrongTrySan(move.san)
    // 1. Specific pedagogical explanation for common mistakes at this step (e.g. Bxd5 vs exd5).
    const specific = expected.wrongMoves?.[move.san]
    if (specific) {
      setWrongFeedback(textOf(specific))
      return false
    }
    // 2. Automatic hanging-piece check: tell the player if their try hangs material!
    const enemy: Color = guide.color === 'white' ? 'black' : 'white'
    const afterFen = chess.fen()
    const hung = hangingPieces(afterFen, guide.color)
    const sq = hung.includes(move.to) ? move.to : hung[0]
    const threat = sq ? cheapestCapturer(afterFen, sq, enemy) : null
    if (threat) {
      setWrongFeedback(formatThreatSentence(threat, 'own'))
      return false
    }
    setWrongFeedback(t('openings.guide.tryAgain'))
    return false
  }

  function onSquareClick(square: string, pieceType: string | undefined) {
    if (!isUserTurn) return
    if (selected && targets.includes(square as Square) && tryMove(selected, square)) return
    setSelected(pieceType?.startsWith(myPrefix) ? (square as Square) : null)
  }

  const squareStyles: Record<string, CSSProperties> = {}
  if (activeWhatIfStep) {
    squareStyles[activeWhatIfStep.from] = LAST_MOVE_STYLE
    squareStyles[activeWhatIfStep.to] = LAST_MOVE_STYLE
  } else if (!activeWhatIf && lastStep) {
    squareStyles[lastStep.from] = LAST_MOVE_STYLE
    squareStyles[lastStep.to] = LAST_MOVE_STYLE
  }
  if (selected && !activeWhatIf) {
    squareStyles[selected] = SELECTED_STYLE
    for (const sq of targets) squareStyles[sq] = TARGET_STYLE
  }

  const arrows = activeWhatIfStep
    ? [
        {
          startSquare: activeWhatIfStep.from,
          endSquare: activeWhatIfStep.to,
          color: ARROW_WHATIF[activeWhatIf!.scenario.kind],
        },
      ]
    : isUserTurn && expected && (mode === 'learn' || showHint)
      ? [{ startSquare: expected.from, endSquare: expected.to, color: ARROW_GUIDE }]
      : []

  const userTotal = steps.filter((s) => s.isUserMove).length
  const userDone = steps.slice(0, stepIndex).filter((s) => s.isUserMove).length

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex w-full max-w-[560px] flex-col gap-2.5 self-center lg:self-start">
        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-1.5">
          <button
            type="button"
            aria-pressed={mode === 'learn'}
            onClick={() => onModeChange('learn')}
            className={`min-h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
              mode === 'learn' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            📖 {t('openings.guide.modeLearn')}
          </button>
          <button
            type="button"
            aria-pressed={mode === 'practice'}
            onClick={() => onModeChange('practice')}
            className={`min-h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
              mode === 'practice'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            🎯 {t('openings.guide.modePractice')}
          </button>
        </div>

        <div className="club-board-frame w-full">
          <div className="aspect-square w-full touch-none select-none overflow-hidden rounded-[6px]">
            <Chessboard
              options={{
                id: 'opening-trainer-board',
                position: fen,
                boardOrientation: guide.color,
                allowDragging: isUserTurn,
                canDragPiece: ({ piece }) => isUserTurn && piece.pieceType.startsWith(myPrefix),
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  targetSquare ? tryMove(sourceSquare, targetSquare) : false,
                onSquareClick: ({ piece, square }) => onSquareClick(square, piece?.pieceType),
                arrows,
                allowDrawingArrows: false,
                squareStyles,
                animationDurationInMs: 220,
                ...boardColors,
              }}
            />
          </div>
        </div>
      </div>

      <aside className="flex min-w-0 flex-1 flex-col gap-3.5 text-sm">
        {activeWhatIf ? (
          /* LIVE WHAT-IF BOARD SIMULATION PANEL */
          <div className="flex flex-col gap-3 rounded-2xl border border-sky-500/50 bg-slate-900/95 p-4 shadow-lg shadow-black/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase ${
                    WHATIF_BADGE_STYLES[activeWhatIf.scenario.kind]
                  }`}
                >
                  {t(`openings.whatif.badge.${activeWhatIf.scenario.kind}`)}
                </span>
                <span className="font-mono text-[11px] font-semibold tracking-wider text-sky-300 uppercase">
                  {t('openings.whatif.playing')}
                </span>
              </div>
              <button
                type="button"
                onClick={closeWhatIf}
                className="min-h-8 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-emerald-500 hover:text-white"
              >
                {t('openings.whatif.backToLine')}
              </button>
            </div>

            <h3 className="text-base font-bold text-white">
              {textOf(activeWhatIf.scenario.prompt)}
            </h3>

            {/* Live step explanation */}
            {activeWhatIfStep && (
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/75 p-3.5">
                {whatIfMoveDetails && (
                  <p className="flex items-center gap-2 text-base font-bold text-white">
                    <span>{formatMoveBadge(whatIfMoveDetails)}</span>
                    <span className="font-mono text-xs font-normal text-slate-400">
                      ({whatIfMoveDetails.san})
                    </span>
                    <span className="ml-auto rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                      {t(`color.${activeWhatIfStep.side}`)}
                    </span>
                  </p>
                )}
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-100">
                  {textOf(activeWhatIfStep.note)}
                </p>
              </div>
            )}

            {/* Stepper controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={whatIfPos <= 1}
                onClick={() => stepWhatIfTo(whatIfPos - 1)}
                className="min-h-9 rounded-lg border border-slate-700 bg-slate-950 px-3.5 font-semibold text-slate-200 hover:border-slate-500 disabled:opacity-40"
              >
                ◀
              </button>
              <span className="font-mono text-xs text-slate-300 tabular-nums">
                {t('openings.whatif.step', {
                  step: whatIfPos,
                  total: activeWhatIf.steps.length,
                })}
              </span>
              <button
                type="button"
                disabled={whatIfPos >= activeWhatIf.steps.length}
                onClick={() => stepWhatIfTo(whatIfPos + 1)}
                className="min-h-9 rounded-lg border border-slate-700 bg-slate-950 px-3.5 font-semibold text-slate-200 hover:border-slate-500 disabled:opacity-40"
              >
                ▶
              </button>
              <button
                type="button"
                onClick={() => startWhatIf(activeWhatIf.scenario)}
                className="ml-auto min-h-9 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 text-xs font-semibold text-sky-200 hover:bg-sky-500/20"
              >
                ↺ {t('openings.whatif.replay')}
              </button>
            </div>

            {/* Move chips for random access */}
            <div className="flex flex-wrap gap-1.5">
              {activeWhatIf.steps.map((ws, i) => (
                <button
                  key={ws.index}
                  type="button"
                  onClick={() => stepWhatIfTo(i + 1)}
                  className={`rounded-md px-2 py-1 font-mono text-xs font-semibold transition-colors ${
                    whatIfPos === i + 1
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {i + 1}. {ws.san}
                </button>
              ))}
            </div>

            {/* Takeaway summary */}
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/25 p-3.5">
              <p className="font-mono text-[11px] font-bold tracking-wider text-amber-300 uppercase">
                💡 {t('openings.whatif.takeaway')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-100">
                {textOf(activeWhatIf.scenario.takeaway)}
              </p>
            </div>
          </div>
        ) : (
          /* MAIN OPENING LINE PANEL */
          <>
            <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3.5">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                <span>{t('openings.guide.stepOf', { step: userDone, total: userTotal })}</span>
                <button
                  type="button"
                  onClick={onRestart}
                  className="text-emerald-400 hover:underline"
                >
                  ↺ {t('openings.guide.restart')}
                </button>
              </div>
              <ProgressBar value={userTotal > 0 ? userDone / userTotal : 0} />

              {!done && expected && (
                <div className="mt-1 flex flex-col gap-1.5">
                  {isUserTurn ? (
                    <>
                      <p className="text-base font-semibold text-white">
                        {t('openings.guide.yourTurn')}
                      </p>
                      {lastStep && (
                        <p className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-300">
                          <span className="font-mono font-semibold text-slate-200">
                            {lastStep.san}
                          </span>
                          {' — '}
                          {textOf(lastStep.note)}
                        </p>
                      )}
                      {(mode === 'learn' || showHint) && (
                        <div className="rounded-xl border border-emerald-700/60 bg-emerald-950/30 p-3.5">
                          {expectedDetails && (
                            <p className="text-base font-bold text-emerald-300">
                              {formatMoveBadge(expectedDetails)}{' '}
                              <span className="font-mono text-xs font-normal text-slate-400">
                                ({expectedDetails.san})
                              </span>
                            </p>
                          )}
                          <p className="mt-1 text-[15px] leading-relaxed text-slate-100">
                            {textOf(expected.note)}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-300">{t('openings.guide.opponentMove')}</p>
                  )}
                </div>
              )}

              {wrongFeedback && !done && (
                <div className="flex flex-col gap-2 rounded-xl border border-rose-700/70 bg-rose-950/35 px-3.5 py-2.5 text-[15px] leading-relaxed text-rose-200">
                  <p>{wrongFeedback}</p>
                  {matchingWrongScenario && (
                    <button
                      type="button"
                      onClick={() => startWhatIf(matchingWrongScenario)}
                      className="min-h-9 self-start rounded-lg bg-rose-500/25 px-3 text-xs font-semibold text-rose-100 ring-1 ring-rose-400/50 transition-colors hover:bg-rose-500/35"
                    >
                      {t('openings.whatif.watchWrong')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {done && (
              <div
                role="status"
                className="flex flex-col gap-3 rounded-xl border border-emerald-700 bg-emerald-950/40 p-4"
              >
                <p className="text-base font-semibold text-emerald-300">
                  ✓ {t('openings.guide.done')}
                </p>
                {lastStep && <p className="text-slate-200">{textOf(lastStep.note)}</p>}
                <div className="flex flex-wrap gap-2">
                  {mode === 'learn' && (
                    <button
                      type="button"
                      onClick={() => onModeChange('practice')}
                      className="min-h-10 rounded-lg bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-500"
                    >
                      🎯 {t('openings.guide.switchPractice')}
                    </button>
                  )}
                  {nextLine && onNextLine && (
                    <button
                      type="button"
                      onClick={onNextLine}
                      className="min-h-10 rounded-lg border border-emerald-500/70 px-4 font-semibold text-emerald-200 hover:bg-emerald-600/20"
                    >
                      {t('openings.guide.nextLine')} →
                    </button>
                  )}
                </div>
              </div>
            )}

            {!done && isUserTurn && mode === 'practice' && !showHint && (
              <button
                type="button"
                onClick={() => setShowHint(true)}
                className="min-h-10 self-start rounded-lg border border-sky-600/70 bg-sky-950/30 px-4 font-medium text-sky-200 hover:border-sky-400"
              >
                💡 {t('openings.guide.hint')}
              </button>
            )}
          </>
        )}

        {/* INTERACTIVE "WHAT IF?" SCENARIO EXPLORER (ALWAYS VISIBLE WHEN SCENARIOS EXIST) */}
        {availableWhatIfs.length > 0 && (
          <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-800 border-t-[3px] border-t-sky-400 bg-slate-900/95 p-4">
            <div className="flex flex-col gap-0.5">
              <p className="font-mono text-xs font-bold tracking-wider text-sky-300 uppercase">
                🔍 {t('openings.whatif.title')}
              </p>
              <p className="text-xs text-slate-400">{t('openings.whatif.subtitle')}</p>
            </div>
            <div className="flex flex-col gap-2">
              {availableWhatIfs.map((scenario) => {
                const isActive = activeWhatIf?.scenario.id === scenario.id
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => startWhatIf(scenario)}
                    className={`group flex items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                      isActive
                        ? 'border-sky-400 bg-sky-500/15 text-white'
                        : 'border-slate-800 bg-slate-950/70 text-slate-200 hover:border-sky-500/60 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <span
                        className={`w-fit rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase ${
                          WHATIF_BADGE_STYLES[scenario.kind]
                        }`}
                      >
                        {t(`openings.whatif.badge.${scenario.kind}`)}
                      </span>
                      <span className="text-sm font-medium leading-snug">
                        {textOf(scenario.prompt)}
                      </span>
                    </div>
                    <span
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-sm text-sky-400 transition-transform group-hover:translate-x-0.5"
                    >
                      ▶
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Off-book golden rule card (shown when no active simulation) */}
        {!activeWhatIf && (
          <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
            <p className="font-mono text-xs font-bold tracking-wider text-slate-400 uppercase">
              🧭 {t('openings.guide.offbook')}
            </p>
            <p className="text-sm leading-relaxed text-slate-300">{textOf(guide.offbookRule)}</p>
          </div>
        )}

        {stepIndex > 0 && !activeWhatIf && (
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-900/70 p-3 font-mono text-xs text-slate-300">
            {steps.slice(0, stepIndex).map((s) => (
              <span
                key={s.index}
                className={`rounded px-1.5 py-0.5 ${
                  s.isUserMove
                    ? 'bg-emerald-500/15 text-emerald-200'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {s.index % 2 === 0 ? `${s.index / 2 + 1}. ` : ''}
                {s.san}
              </span>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}
