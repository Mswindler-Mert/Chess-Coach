import { useSyncExternalStore } from 'react'
import { t, type MessageKey } from '../i18n'
import { AnalysisBadge } from './analysis'
import { LanguageSwitch } from './LanguageSwitch'
import { routeHref, type Route } from './router'
import { isSoundEnabled, playSound, setSoundEnabled, subscribeSound } from './sound'
import { ThemeSwitch } from './ThemeSwitch'

type Section = 'games' | 'puzzles' | 'hanging' | 'openings' | 'endgames' | 'dashboard'

interface NavItem {
  id: Section
  label: MessageKey
  icon: (className: string) => React.ReactNode
}

const ITEMS: readonly NavItem[] = [
  {
    id: 'games',
    label: 'nav.games',
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
    id: 'puzzles',
    label: 'nav.puzzles',
    icon: (c) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={c}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v3m0 12v3M3 12h3m12 0h3M6.34 6.34l2.12 2.12m7.08 7.08 2.12 2.12m0-11.32-2.12 2.12m-7.08 7.08-2.12 2.12"
        />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: 'hanging',
    label: 'nav.hanging',
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
      className="grid size-8 place-items-center rounded-md border border-slate-700 text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
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

export function TopNav({ route, username }: { route: Route; username: string }) {
  const current = activeSection(route)
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-950/88 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5">
        <a
          href={routeHref({ name: 'games', username })}
          className="flex items-center gap-2.5 font-semibold tracking-tight text-slate-100 hover:text-white"
        >
          <span
            aria-hidden="true"
            className="grid size-7 place-items-center rounded-md border border-emerald-500/40 bg-emerald-600/20 text-sm text-emerald-300"
          >
            ♞
          </span>
          <span className="font-display truncate text-lg font-semibold tracking-tight">
            {t('app.title')}
          </span>
        </a>
        <div className="flex items-center gap-2">
          <AnalysisBadge />
          <ThemeSwitch />
          <SoundToggle />
          <a
            href={routeHref({ name: 'home' })}
            className="hidden rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-slate-100 sm:inline-block sm:text-sm"
          >
            {t('nav.changeUser')}
          </a>
          <LanguageSwitch />
        </div>
      </div>

      {/* Desktop section tabs */}
      <nav aria-label={t('app.title')} className="hidden border-t border-slate-800/60 sm:block">
        <div className="mx-auto flex max-w-5xl items-center gap-1 px-4">
          {ITEMS.map((item) => {
            const active = current === item.id
            return (
              <a
                key={item.id}
                href={sectionHref(item.id, username)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'text-emerald-300' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <span aria-hidden="true">{item.icon('size-4')}</span>
                <span>{t(item.label)}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-emerald-400"
                  />
                )}
              </a>
            )
          })}
        </div>
      </nav>
    </header>
  )
}

/** Fixed bottom tab bar on mobile screens so every module is one tap away. */
export function BottomNav({ route, username }: { route: Route; username: string }) {
  const current = activeSection(route)
  return (
    <nav
      aria-label={t('app.title')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
    >
      <div className="grid grid-cols-6">
        {ITEMS.map((item) => {
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
