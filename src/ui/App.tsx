import { t } from '../i18n'
import { GamePage } from './pages/GamePage'
import { GamesPage } from './pages/GamesPage'
import { HomePage } from './pages/HomePage'
import { routeHref, useRoute } from './router'

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
            <a
              href={routeHref({ name: 'home' })}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              {t('nav.changeUser')}
            </a>
          </div>
        </nav>
      )}

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-6 sm:py-10">
        {route.name === 'home' && <HomePage />}
        {route.name === 'games' && <GamesPage key={route.username} username={route.username} />}
        {route.name === 'game' && (
          <GamePage key={route.id} username={route.username} id={route.id} />
        )}

        <footer className="text-xs text-slate-500">
          {t('footer.license', { name: t('app.title') })}
        </footer>
      </main>
    </div>
  )
}
