import { useEffect, useState } from 'react'
import type { GameFilter } from '../core/games/filter'
import type { TimeClass } from '../core/games/model'
import { DAILY_GOAL, type PlanItem } from '../core/training/daily'
import { loadDailyPlan, type DailyData } from '../db/daily'
import { analysisRunner } from '../engine/runner'
import { t } from '../i18n'
import { ProgressBar } from './analysis'
import { routeHref, type Route } from './router'

/** "Today's training": streak, daily goal and a short plan with links. */
export function DailyCard({ username, filter }: { username: string; filter: GameFilter }) {
  const [data, setData] = useState<DailyData | null>(null)
  const { timeClasses, dateRange } = filter
  const tempoKey = timeClasses.join(',')

  useEffect(() => {
    const shown: GameFilter = {
      timeClasses: tempoKey ? (tempoKey.split(',') as TimeClass[]) : [],
      dateRange,
    }
    const load = () => void loadDailyPlan(username, Date.now(), shown).then(setData)
    load()
    // New analyses bring new puzzles and drills: refresh when the runner finishes a batch.
    let wasRunning = analysisRunner.getState().status === 'running'
    return analysisRunner.subscribe(() => {
      const running = analysisRunner.getState().status === 'running'
      if (wasRunning && !running) load()
      wasRunning = running
    })
  }, [username, tempoKey, dateRange])

  if (!data) return null
  const { streak, plan } = data
  const done = Math.min(streak.today, DAILY_GOAL)

  return (
    <section className="flex flex-col gap-3.5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 p-4 shadow-sm shadow-emerald-950/30 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-white">{t('daily.title')}</h2>
        <div className="flex items-center gap-2 text-xs">
          {streak.current > 0 ? (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 font-medium text-amber-200">
              {t('daily.streak', { days: streak.current })}
            </span>
          ) : (
            <span className="text-slate-400">{t('daily.noStreak')}</span>
          )}
          {streak.best > streak.current && (
            <span className="text-slate-500">{t('daily.best', { days: streak.best })}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-slate-300">
          {streak.today >= DAILY_GOAL
            ? t('daily.goalDone', { count: streak.today })
            : t('daily.goal', { done, goal: DAILY_GOAL })}
        </p>
        <ProgressBar value={done / DAILY_GOAL} />
      </div>
      {plan.length === 0 ? (
        <p className="text-sm text-slate-400">{t('daily.empty')}</p>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-2">
          {plan.map((item) => (
            <li key={item.kind}>
              <a
                href={routeHref(routeFor(item, username))}
                className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm transition-colors hover:border-emerald-500/50 hover:bg-slate-900"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`grid size-7 shrink-0 place-items-center rounded-lg text-sm ${badgeStyle(item.kind)}`}
                  >
                    {iconFor(item.kind)}
                  </span>
                  <span className="font-medium text-slate-100">{labelFor(item)}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400"
                >
                  →
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function iconFor(kind: PlanItem['kind']): string {
  switch (kind) {
    case 'puzzles':
      return '♞'
    case 'hanging':
      return '🎯'
    case 'endgame':
      return '♚'
    case 'review':
      return '🔍'
  }
}

function badgeStyle(kind: PlanItem['kind']): string {
  switch (kind) {
    case 'puzzles':
      return 'bg-emerald-500/15 text-emerald-300'
    case 'hanging':
      return 'bg-rose-500/15 text-rose-300'
    case 'endgame':
      return 'bg-amber-500/15 text-amber-300'
    case 'review':
      return 'bg-sky-500/15 text-sky-300'
  }
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
