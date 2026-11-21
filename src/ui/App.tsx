import { Suspense } from 'react'
import { t } from '../i18n'
import { LanguageSwitch } from './LanguageSwitch'
import { lazyPage } from './lazyPage'
import { GamesPage } from './pages/GamesPage'
import { HomePage } from './pages/HomePage'
import { routeHref, useRoute } from './router'

// The first screens load with the app; the rest (board, charts) load when opened.
const GamePage = lazyPage(() => import('./pages/GamePage').then((m) => m.GamePage))
const PuzzlePage = lazyPage(() => import('./pages/PuzzlePage').then((m) => m.PuzzlePage))
const EndgamesPage = lazyPage(() => import('./pages/EndgamesPage').then((m) => m.EndgamesPage))
const OpeningsPage = lazyPage(() => import('./pages/OpeningsPage').then((m) => m.OpeningsPage))
const DashboardPage = lazyPage(() => import('./pages/DashboardPage').then((m) => m.DashboardPage))

export default function App() {
  const route = useRoute()

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      {route.name !== 'home' && (
        <nav className="border-b border-slate-800 bg-slate-900/60">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <a href={routeHref({ name: 'home' })} className="font-semibold">
              <span aria-hidden="true" className="mr-1">
                ♛
              </span>
              {t('app.title')}
            </a>
            <div className="flex items-center gap-3">
              <a
                href={routeHref({ name: 'home' })}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                {t('nav.changeUser')}
              </a>
              <LanguageSwitch />
            </div>
          </div>
        </nav>
      )}

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-6 sm:py-10">
        <Suspense fallback={<p className="text-slate-400">{t('app.loading')}</p>}>
          {route.name === 'home' && <HomePage />}
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
          {route.name === 'openings' && (
            <OpeningsPage key={route.username} username={route.username} />
          )}
          {route.name === 'dashboard' && (
            <DashboardPage key={route.username} username={route.username} />
          )}
        </Suspense>

        <footer className="text-xs text-slate-500">
          {t('footer.license', { name: t('app.title') })}
        </footer>
      </main>
    </div>
  )
}
