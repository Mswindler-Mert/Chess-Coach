import { Suspense, useEffect } from 'react'
import { t } from '../i18n'
import { startBackgroundWork } from './background'
import { lazyPage } from './lazyPage'
import { BottomNav, DesktopSidebar, MobileTopBar } from './Nav'
import { activeSection, SECTION_STYLES } from './sections'
import { GamesPage } from './pages/GamesPage'
import { HomePage } from './pages/HomePage'
import { OverviewPage } from './pages/OverviewPage'
import { useRoute } from './router'

// The first screens load with the app; the rest (board, charts) load when opened.
const GamePage = lazyPage(() => import('./pages/GamePage').then((m) => m.GamePage))
const PuzzlePage = lazyPage(() => import('./pages/PuzzlePage').then((m) => m.PuzzlePage))
const EndgamesPage = lazyPage(() => import('./pages/EndgamesPage').then((m) => m.EndgamesPage))
const OpeningsPage = lazyPage(() => import('./pages/OpeningsPage').then((m) => m.OpeningsPage))
const HangingPage = lazyPage(() => import('./pages/HangingPage').then((m) => m.HangingPage))
const DashboardPage = lazyPage(() => import('./pages/DashboardPage').then((m) => m.DashboardPage))

export default function App() {
  const route = useRoute()
  const routeUsername = 'username' in route ? route.username : null

  useEffect(() => {
    startBackgroundWork(routeUsername)
    // Runs once per app start (guarded inside), with the user on screen at that moment.
  }, [routeUsername])

  if (!routeUsername) {
    return (
      <div className="min-h-dvh text-slate-100">
        <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6 sm:py-10">
          <HomePage />
          <footer className="text-xs text-slate-500">
            {t('footer.license', { name: t('app.title') })}
          </footer>
        </main>
      </div>
    )
  }

  const section = activeSection(route)
  const sectionGlow = section ? SECTION_STYLES[section].pageGlow : undefined

  return (
    <div className="min-h-dvh text-slate-100 lg:flex">
      <DesktopSidebar route={route} username={routeUsername} />

      <div
        className="flex min-w-0 flex-1 flex-col transition-[background-image] duration-300"
        style={
          sectionGlow
            ? {
                backgroundImage: `radial-gradient(ellipse 75% 42% at 32% -8%, ${sectionGlow}, transparent 70%)`,
              }
            : undefined
        }
      >
        <MobileTopBar username={routeUsername} />

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-10 lg:pb-10">
          <Suspense fallback={<p className="text-slate-400">{t('app.loading')}</p>}>
            {route.name === 'overview' && (
              <OverviewPage key={route.username} username={route.username} />
            )}
            {route.name === 'games' && <GamesPage key={route.username} username={route.username} />}
            {route.name === 'game' && (
              <GamePage
                key={`${route.id}:${route.ply ?? 0}`}
                username={route.username}
                id={route.id}
                initialPly={route.ply ?? 0}
              />
            )}
            {route.name === 'puzzles' && (
              <PuzzlePage
                key={`${route.username}:${route.focus ?? ''}`}
                username={route.username}
                focus={route.focus}
              />
            )}
            {route.name === 'endgames' && (
              <EndgamesPage
                key={`${route.username}:${route.lesson ?? ''}`}
                username={route.username}
                lesson={route.lesson}
              />
            )}
            {route.name === 'hanging' && (
              <HangingPage key={route.username} username={route.username} />
            )}
            {route.name === 'openings' && (
              <OpeningsPage key={route.username} username={route.username} />
            )}
            {route.name === 'dashboard' && (
              <DashboardPage key={route.username} username={route.username} />
            )}
          </Suspense>

          <footer className="mt-auto pt-4 text-xs text-slate-500">
            {t('footer.license', { name: t('app.title') })}
          </footer>
        </main>
      </div>

      <BottomNav route={route} username={routeUsername} />
    </div>
  )
}
