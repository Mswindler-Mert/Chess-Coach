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
    <section className="flex flex-col gap-3 rounded-xl border border-emerald-800 bg-emerald-950/20 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{t('daily.title')}</h2>
        <p className="text-sm text-slate-300">
          {streak.current > 0 ? t('daily.streak', { days: streak.current }) : t('daily.noStreak')}
          {streak.best > streak.current && (
            <span className="text-slate-500"> · {t('daily.best', { days: streak.best })}</span>
          )}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-slate-400">
          {streak.today >= DAILY_GOAL
            ? t('daily.goalDone', { count: streak.today })
            : t('daily.goal', { done, goal: DAILY_GOAL })}
        </p>
        <ProgressBar value={done / DAILY_GOAL} />
      </div>
      {plan.length === 0 ? (
        <p className="text-sm text-slate-400">{t('daily.empty')}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {plan.map((item) => (
            <li key={item.kind}>
              <a
                href={routeHref(routeFor(item, username))}
                className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm hover:border-slate-600"
              >
                <span>{labelFor(item)}</span>
                <span aria-hidden="true" className="text-slate-500">
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
