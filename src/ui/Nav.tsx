import { useEffect, useState, useSyncExternalStore } from 'react'
import { OPENING_GUIDES } from '../core/openings/guides'
import { loadDailyPlan } from '../db/daily'
import { getGameFilter } from '../db/games'
import { getOpeningProgress } from '../db/openings'
import { analysisRunner } from '../engine/runner'
import { t, type MessageKey } from '../i18n'
import { AnalysisBadge } from './analysis'
import { useAnalysisRunner } from './analysisStyles'
import { accountLabel } from './format'
import { LanguageSwitch } from './LanguageSwitch'
import { routeHref, type Route } from './router'
import { isSoundEnabled, playSound, setSoundEnabled, subscribeSound } from './sound'
import { ThemeSwitch } from './ThemeSwitch'

type Section = 'overview' | 'games' | 'puzzles' | 'hanging' | 'openings' | 'endgames' | 'dashboard'

interface NavItem {
  id: Section
  label: MessageKey
  mobile?: boolean
  icon: (className: string) => React.ReactNode
}

const ITEMS: readonly NavItem[] = [
  {
    id: 'overview',
    label: 'nav.overview',
    mobile: true,
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'games',
    label: 'nav.games',
    mobile: true,
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    id: 'puzzles',
    label: 'nav.puzzles',
    mobile: true,
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
        />
      </svg>
    ),
  },
  {
    id: 'hanging',
    label: 'nav.hanging',
    mobile: true,
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
      </svg>
    ),
  },
  {
    id: 'openings',
    label: 'nav.openings',
    mobile: true,
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22V5.5Zm16 0A2.5 2.5 0 0 0 17.5 3H12v17h5.5a2.5 2.5 0 0 1 2.5 2V5.5Z"
        />
      </svg>
    ),
  },
  {
    id: 'endgames',
    label: 'nav.endgames',
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v4m-2-2h4m-6 14h8l1.5-8-3.5 2-2-4-2 4-3.5-2L8 19Zm-1 2h10"
        />
      </svg>
    ),
  },
  {
    id: 'dashboard',
    label: 'nav.dashboard',
    mobile: true,
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M7 16v-5m5 5V7m5 9v-8" />
      </svg>
    ),
  },
]

function activeSection(route: Route): Section | null {
  if (route.name === 'home') return null
  if (route.name === 'game') return 'games'
  return route.name
}

function sectionHref(section: Section, username: string): string {
  return routeHref({ name: section, username })
}

export function SoundToggle() {
  const on = useSyncExternalStore(subscribeSound, isSoundEnabled, isSoundEnabled)
  const label = on ? t('nav.soundOn') : t('nav.soundOff')
  return (
    <button
      type="button"
      onClick={() => {
        const next = !on
        setSoundEnabled(next)
        if (next) playSound('move')
      }}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
    >
      {on ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="size-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5 6 9H3v6h3l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="size-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"
          />
        </svg>
      )}
    </button>
  )
}

interface SidebarCounts {
  puzzles: number
  hanging: number
  openingsDone: number
  openingsTotal: number
}

function useSidebarCounts(username: string): SidebarCounts {
  const [counts, setCounts] = useState<SidebarCounts>({
    puzzles: 0,
    hanging: 0,
    openingsDone: 0,
    openingsTotal: OPENING_GUIDES.reduce((sum, g) => sum + g.lines.length, 0),
  })

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [filter, opProg] = await Promise.all([getGameFilter(), getOpeningProgress()])
        const daily = await loadDailyPlan(username, Date.now(), filter)
        if (!active) return
        const puzzleItem = daily.plan.find((i) => i.kind === 'puzzles')
        const hangingItem = daily.plan.find((i) => i.kind === 'hanging')
        const openingsDone = Object.values(opProg).filter(Boolean).length
        setCounts({
          puzzles: puzzleItem?.kind === 'puzzles' ? puzzleItem.count : 0,
          hanging: hangingItem?.kind === 'hanging' ? hangingItem.count : 0,
          openingsDone,
          openingsTotal: OPENING_GUIDES.reduce((sum, g) => sum + g.lines.length, 0),
        })
      } catch {
        // Ignore transient db errors in sidebar badges.
      }
    }
    void load()
    return analysisRunner.onSaved(() => void load())
  }, [username])

  return counts
}

/** Fixed left desktop sidebar inspired by tactile focus workbooks. */
export function DesktopSidebar({ route, username }: { route: Route; username: string }) {
  const current = activeSection(route)
  const runner = useAnalysisRunner()
  const counts = useSidebarCounts(username)
  const running = runner.status === 'running' && runner.username === username

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-4 border-r border-slate-800/90 bg-slate-950/95 p-4 lg:flex">
      {/* Brand header */}
      <a
        href={routeHref({ name: 'overview', username })}
        className="flex items-center gap-2.5 px-1 py-0.5 text-slate-100 hover:text-white"
      >
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-lg border border-emerald-500/40 bg-emerald-600/20 text-base text-emerald-300"
        >
          ♞
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs font-bold tracking-wider uppercase">
            {t('app.title')}
          </span>
          <span className="font-mono text-[10px] text-slate-500">v2.0</span>
        </div>
      </a>

      {/* Two-tone theme selector */}
      <ThemeSwitch showLabel />

      {/* Live account & engine status widget */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full ${
              running ? 'animate-pulse bg-emerald-400' : 'bg-rose-400/80'
            }`}
          />
          <span className="truncate font-mono text-xs font-semibold text-slate-100">
            {accountLabel(username)}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {running
            ? t('overview.sidebar.engineWorking', { remaining: runner.remaining })
            : t('overview.sidebar.engineIdle')}
        </p>
        <div className="flex flex-col gap-1.5">
          {running ? (
            <button
              type="button"
              onClick={() => analysisRunner.pause()}
              className="min-h-8 rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500"
            >
              {t('analysis.pause')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => analysisRunner.start(username)}
              className="min-h-8 rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-emerald-500/60 hover:text-emerald-200"
            >
              {t('analysis.start')}
            </button>
          )}
          <a
            href={routeHref({ name: 'home' })}
            className="grid min-h-8 place-items-center rounded-lg border border-slate-800 bg-slate-950/40 px-3 text-xs font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-100"
          >
            {t('nav.changeUser')}
          </a>
        </div>
      </div>

      {/* Primary vertical navigation */}
      <nav aria-label={t('app.title')} className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {ITEMS.map((item) => {
          const active = current === item.id
          const badge =
            item.id === 'puzzles' && counts.puzzles > 0
              ? String(counts.puzzles)
              : item.id === 'hanging' && counts.hanging > 0
                ? String(counts.hanging)
                : item.id === 'openings' && counts.openingsDone < counts.openingsTotal
                  ? `${counts.openingsDone}/${counts.openingsTotal}`
                  : null
          return (
            <a
              key={item.id}
              href={sectionHref(item.id, username)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-100 font-semibold text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden="true">{item.icon('size-4')}</span>
                <span>{t(item.label)}</span>
              </span>
              {badge && (
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold ${
                    active
                      ? 'bg-slate-900 text-slate-100'
                      : item.id === 'openings'
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-emerald-600 text-white'
                  }`}
                >
                  {badge}
                </span>
              )}
            </a>
          )
        })}
      </nav>

      {/* Footer utility controls */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
        <SoundToggle />
        <LanguageSwitch />
      </div>
    </aside>
  )
}

/** Compact top header shown only on mobile / tablet screens. */
export function MobileTopBar({ username }: { username: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-950/92 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex items-center justify-between gap-2 px-4 py-2.5">
        <a
          href={routeHref({ name: 'overview', username })}
          className="flex items-center gap-2 font-semibold text-slate-100"
        >
          <span
            aria-hidden="true"
            className="grid size-7 place-items-center rounded-md border border-emerald-500/40 bg-emerald-600/20 text-sm text-emerald-300"
          >
            ♞
          </span>
          <span className="truncate font-mono text-xs font-bold tracking-wider uppercase">
            {t('app.title')}
          </span>
        </a>
        <div className="flex items-center gap-1.5">
          <AnalysisBadge />
          <ThemeSwitch />
          <SoundToggle />
          <LanguageSwitch />
        </div>
      </div>
    </header>
  )
}

/** Fixed bottom tab bar on mobile screens so every key module is one tap away. */
export function BottomNav({ route, username }: { route: Route; username: string }) {
  const current = activeSection(route)
  const mobileItems = ITEMS.filter((i) => i.mobile)
  return (
    <nav
      aria-label={t('app.title')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="grid grid-cols-6">
        {mobileItems.map((item) => {
          const active = current === item.id
          return (
            <a
              key={item.id}
              href={sectionHref(item.id, username)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] leading-tight font-medium transition-colors ${
                active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span aria-hidden="true">{item.icon('size-5')}</span>
              <span className="max-w-full truncate px-0.5">{t(item.label)}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
