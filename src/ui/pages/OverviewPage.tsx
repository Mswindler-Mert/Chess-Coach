import { useCallback, useEffect, useMemo, useState } from 'react'
import { normalizeUsername } from '../../core/api/username'
import { applyGameFilter } from '../../core/games/filter'
import { opponentOf, type Game } from '../../core/games/model'
import { summarize, type DashboardSummary } from '../../core/stats/dashboard'
import type { PlayerDiagnosis } from '../../core/stats/diagnosis'
import { DAILY_GOAL, type ActivityLog, type PlanItem } from '../../core/training/daily'
import { buildHeatmap, type HeatLevel } from '../../core/training/heatmap'
import { listAnalysisSummaries, type AnalysisSummary } from '../../db/analyses'
import { getActivityLog, loadDailyPlan, type DailyData } from '../../db/daily'
import { loadDashboard } from '../../db/dashboard'
import { getGameFilter, listGames, setLastUsername, syncUserGames } from '../../db/games'
import { analysisRunner } from '../../engine/runner'
import { formatNumber, formatPercent, t } from '../../i18n'
import { ErrorChips } from '../analysis'
import { useAnalysisRunner } from '../analysisStyles'
import { autoAnalyzeAfterSync } from '../background'
import { DiagnosisCard } from '../DiagnosisCard'
import { formatDate, outcomeStyles, timeClassLabel } from '../format'
import { routeHref, type Route } from '../router'

interface OverviewBundle {
  daily: DailyData
  log: ActivityLog
  dashboard: DashboardSummary
  diagnosis: PlayerDiagnosis
  recentGames: Game[]
  summaries: Map<string, AnalysisSummary>
  pendingPuzzles: number
}

const HEAT_CLASSES: Record<HeatLevel, string> = {
  0: 'bg-slate-800/80',
  1: 'bg-emerald-900',
  2: 'bg-emerald-700',
  3: 'bg-emerald-500',
  4: 'bg-emerald-400',
}

export function OverviewPage({ username: rawUsername }: { username: string }) {
  const username = normalizeUsername(rawUsername)
  if (!username) return <p className="text-rose-400">{t('home.username.invalid')}</p>
  return <OverviewCockpit username={username} />
}

function OverviewCockpit({ username }: { username: string }) {
  const [now] = useState(() => Date.now())
  const [bundle, setBundle] = useState<OverviewBundle | null>(null)
  const [syncing, setSyncing] = useState(true)
  const runner = useAnalysisRunner()
  const analyzing = runner.status === 'running' && runner.username === username

  const load = useCallback(() => {
    return Promise.all([
      getGameFilter(),
      listGames(username),
      getActivityLog(),
      loadDashboard(username, now),
      listAnalysisSummaries(username),
    ]).then(async ([filter, allGames, log, dashData, summaries]) => {
      const daily = await loadDailyPlan(username, now, filter)
      const dashboard = summarize(dashData.errors)
      const visible = applyGameFilter(allGames, filter, now)
      const puzzleItem = daily.plan.find((i) => i.kind === 'puzzles')
      const pendingPuzzles = puzzleItem?.kind === 'puzzles' ? puzzleItem.count : 0
      setBundle({
        daily,
        log,
        dashboard,
        diagnosis: dashData.diagnosis,
        recentGames: visible.slice(0, 5),
        summaries,
        pendingPuzzles,
      })
    })
  }, [username, now])

  useEffect(() => {
    void load()
    syncUserGames(username)
      .then(async () => {
        await setLastUsername(username)
        await load()
      })
      .catch(() => {
        // Offline or API error: still display cached data.
      })
      .finally(() => {
        setSyncing(false)
        void autoAnalyzeAfterSync(username)
      })
  }, [username, load])

  useEffect(() => analysisRunner.onSaved(() => void load()), [load])

  const heatmap = useMemo(
    () => (bundle ? buildHeatmap(bundle.log, new Date(now), 16, DAILY_GOAL) : null),
    [bundle, now],
  )

  if (!bundle || !heatmap) {
    return <p className="text-slate-400">{t('app.loading')}</p>
  }

  const { daily, dashboard, diagnosis, recentGames, summaries, pendingPuzzles } = bundle
  const { streak, plan } = daily
  const doneToday = streak.today
  const goalPct = Math.min(1, doneToday / DAILY_GOAL)
  const leftToday = Math.max(0, DAILY_GOAL - doneToday)
  const firstItem = plan[0]
  const topMotifs = dashboard.byMotif.filter((m) => m.errors > 0).slice(0, 5)
  const maxMotif = topMotifs[0]?.errors ?? 1
  const tierKey =
    streak.current >= 7
      ? 'overview.heatmap.tierMaster'
      : streak.current >= 3
        ? 'overview.heatmap.tierSteady'
        : 'overview.heatmap.tierStart'

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-emerald-400 uppercase">
            {t('overview.kicker')}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            {t('overview.title')}
          </h1>
        </div>
        <button
          type="button"
          disabled={syncing}
          onClick={() => {
            setSyncing(true)
            void syncUserGames(username)
              .then(() => load())
              .finally(() => setSyncing(false))
          }}
          className="min-h-9 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-50"
        >
          {syncing ? '↻ …' : `↻ ${t('sync.refresh')}`}
        </button>
      </header>

      {/* Row 1: Hero Focus Card + Solid Green Donut Goal Card */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* Left: Main focus & coach next step */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-lg shadow-black/25 lg:col-span-7">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                {t('overview.todayLabel')}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase ${
                  analyzing
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50'
                    : 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-500/40'
                }`}
              >
                {analyzing ? t('overview.statusAnalyzing') : t('overview.statusReady')}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold tracking-tight text-slate-100 tabular-nums sm:text-5xl">
                {String(doneToday).padStart(2, '0')}
                <span className="text-2xl text-slate-500 sm:text-3xl">/{DAILY_GOAL}</span>
              </span>
            </div>

            <p className="text-sm font-medium text-lime-400">
              {leftToday === 0
                ? t('overview.goalReachedShort')
                : t('overview.remaining', { left: leftToday })}
            </p>
          </div>

          {/* Inner focus guidance box */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-slate-800/90 bg-slate-950/75 p-3.5">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              {t('overview.coachBox')}
            </span>
            {firstItem ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-100">{labelFor(firstItem)}</p>
                <a
                  href={routeHref(routeFor(firstItem, username))}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  {t('overview.startNow')} →
                </a>
              </div>
            ) : (
              <p className="text-sm text-slate-400">{t('daily.empty')}</p>
            )}
            {plan.length > 1 && (
              <div className="flex flex-wrap gap-1.5 border-t border-slate-800/80 pt-2.5">
                {plan.slice(1).map((item) => (
                  <a
                    key={item.kind}
                    href={routeHref(routeFor(item, username))}
                    className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:border-emerald-500/60 hover:text-white"
                  >
                    {labelFor(item)} →
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Solid Olive/Forest Daily Goal Ring Card */}
        <div
          className="flex flex-col justify-between gap-4 rounded-2xl border p-5 shadow-lg shadow-black/25 lg:col-span-5"
          style={{
            backgroundColor: 'var(--goal-bg)',
            borderColor: 'var(--goal-border)',
          }}
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-mono font-semibold tracking-wider text-slate-200/80 uppercase">
              {t('overview.goalHeader')}
            </span>
            <span className="text-slate-200/80">
              {t('overview.goalTarget', { goal: DAILY_GOAL })}
            </span>
          </div>

          <div className="my-1 flex justify-center">
            <GoalRing share={goalPct} />
          </div>

          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-200/70 uppercase">
                {t('overview.currentStreak')}
              </span>
              <span className="font-mono text-xl font-bold text-white">
                {t('overview.streakDays', { days: streak.current })}
              </span>
            </div>
            <span className="text-xs text-slate-200/80">
              {t('overview.bestStreak', { days: streak.best })}
            </span>
          </div>
        </div>
      </section>

      {/* Row 2: 3 Coloured Top-Stripe KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-800 border-t-[3px] border-t-sky-400 bg-slate-900/95 p-4">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            {t('overview.kpi.accuracy')}
          </span>
          <span className="font-mono text-3xl font-bold text-slate-100 tabular-nums">
            {dashboard.accuracy !== null ? formatNumber(dashboard.accuracy, 1) : '—'}
          </span>
          <span className="text-xs text-slate-400">
            {t('overview.kpi.accuracySub', { analyzed: dashboard.games })}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-800 border-t-[3px] border-t-lime-400 bg-slate-900/95 p-4">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            {t('overview.kpi.goalDays')}
          </span>
          <span className="font-mono text-3xl font-bold text-slate-100 tabular-nums">
            {heatmap.goalDays}
          </span>
          <span className="text-xs text-slate-400">
            {t('overview.kpi.activeDays', { active: heatmap.activeDays })}
          </span>
        </div>

        <a
          href={routeHref({ name: 'puzzles', username })}
          className="group flex flex-col gap-1.5 rounded-2xl border border-emerald-800/80 border-t-[3px] border-t-emerald-500 bg-emerald-950/55 p-4 transition-colors hover:border-emerald-500 hover:bg-emerald-950/75"
        >
          <span className="font-mono text-[10px] font-semibold tracking-wider text-emerald-200/80 uppercase">
            {t('overview.kpi.pending')}
          </span>
          <span className="font-mono text-3xl font-bold text-white tabular-nums">
            {pendingPuzzles}
          </span>
          <span className="text-xs font-medium text-emerald-300 group-hover:text-emerald-200">
            {t('overview.kpi.pendingAction')}
          </span>
        </a>
      </section>

      {/* Row 2.5: Personal Diagnosis Report ("Where Are You Breaking Down?") */}
      <DiagnosisCard username={username} diagnosis={diagnosis} />

      {/* Row 3: "Don't Break the Chain" Activity Heatmap */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-100">{t('overview.heatmap.title')}</h2>
            <span className="rounded-md bg-lime-500/20 px-2 py-0.5 text-xs font-semibold text-lime-300">
              {t(tierKey)}
            </span>
          </div>
          <span className="font-mono text-xs text-slate-400">
            {t('overview.heatmap.last7', { count: heatmap.last7Days })}
          </span>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="inline-grid grid-flow-col gap-1.5">
            {heatmap.weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-rows-7 gap-1.5">
                {week.map((cell) => (
                  <div
                    key={cell.date}
                    title={t('overview.heatmap.cell', { date: cell.date, count: cell.count })}
                    className={`size-4 rounded-[4px] transition-transform hover:scale-125 sm:size-4.5 ${
                      cell.isFuture ? 'bg-slate-900/40 opacity-40' : HEAT_CLASSES[cell.level]
                    } ${cell.isToday ? 'ring-2 ring-slate-100' : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Row 4: Where Mistakes Come From + Recent Games */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-100">{t('overview.motifs.title')}</h2>
            <a
              href={routeHref({ name: 'dashboard', username })}
              className="text-xs font-medium text-emerald-400 hover:underline"
            >
              {t('nav.dashboard')} →
            </a>
          </div>
          {topMotifs.length === 0 ? (
            <p className="text-sm text-slate-400">{t('overview.motifs.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {topMotifs.map((m) => (
                <li key={m.motif}>
                  <a
                    href={routeHref({ name: 'puzzles', username, focus: m.motif })}
                    className="group flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200 group-hover:text-emerald-300">
                        {t(`motif.${m.motif}`)}
                      </span>
                      <span className="font-mono text-slate-400 tabular-nums">{m.errors}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all group-hover:bg-emerald-400"
                        style={{ width: `${Math.max(8, (m.errors / maxMotif) * 100)}%` }}
                      />
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-100">{t('overview.recent.title')}</h2>
            <a
              href={routeHref({ name: 'games', username })}
              className="text-xs font-medium text-emerald-400 hover:underline"
            >
              {t('overview.recent.all')}
            </a>
          </div>
          {recentGames.length === 0 ? (
            <p className="text-sm text-slate-400">{t('games.empty')}</p>
          ) : (
            <ul className="divide-y divide-slate-800/80">
              {recentGames.map((game) => {
                const opp = opponentOf(game)
                const summary = summaries.get(game.id)
                return (
                  <li key={game.id}>
                    <a
                      href={routeHref({ name: 'game', username, id: game.id })}
                      className="flex items-center gap-3 py-2.5 transition-colors hover:bg-slate-800/30"
                    >
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold ${outcomeStyles[game.outcome]}`}
                      >
                        {t(`outcome.short.${game.outcome}`)}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-slate-100">
                          {opp.username}{' '}
                          <span className="text-xs text-slate-400">({opp.rating})</span>
                        </span>
                        <span className="text-xs text-slate-400">
                          {timeClassLabel(game.timeClass)} · {formatDate(game.endTime)}
                        </span>
                      </div>
                      {summary && (
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          {summary.accuracy[game.userColor] !== null && (
                            <span className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
                              {formatNumber(summary.accuracy[game.userColor] ?? 0, 0)}%
                            </span>
                          )}
                          <ErrorChips counts={summary.counts[game.userColor]} />
                        </div>
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function GoalRing({ share }: { share: number }) {
  const clamped = Math.max(0, Math.min(1, share))
  const r = 52
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - clamped)
  return (
    <div className="relative grid size-36 place-items-center">
      <svg viewBox="0 0 132 132" className="size-full -rotate-90">
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="rgba(255, 255, 255, 0.16)"
          strokeWidth="12"
        />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="var(--goal-ring)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold text-white tabular-nums">
          {formatPercent(clamped)}
        </span>
        <span className="text-[11px] text-slate-200/80">{t('overview.completed')}</span>
      </div>
    </div>
  )
}

function routeFor(item: PlanItem, username: string): Route {
  switch (item.kind) {
    case 'puzzles':
      return { name: 'puzzles', username }
    case 'hanging':
      return { name: 'hanging', username }
    case 'endgame':
      return { name: 'endgames', username, lesson: item.lessonId }
    case 'review':
      return item.ply
        ? { name: 'game', username, id: item.gameId, ply: item.ply }
        : { name: 'game', username, id: item.gameId }
  }
}

function labelFor(item: PlanItem): string {
  switch (item.kind) {
    case 'puzzles':
      return item.due > 0
        ? t('daily.item.puzzlesDue', { count: item.count, due: item.due })
        : t('daily.item.puzzles', { count: item.count })
    case 'hanging':
      return t('daily.item.hanging', { count: item.count })
    case 'endgame':
      return t('daily.item.endgame', {
        lesson: t(`endgame.lesson.${item.lessonId}` as Parameters<typeof t>[0]),
      })
    case 'review':
      return t('daily.item.review')
  }
}
