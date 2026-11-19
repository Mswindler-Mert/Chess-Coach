import { t, type MessageKey } from '../i18n'

const features: { icon: string; title: MessageKey; body: MessageKey }[] = [
  { icon: '♞', title: 'home.features.puzzles.title', body: 'home.features.puzzles.body' },
  { icon: '♝', title: 'home.features.openings.title', body: 'home.features.openings.body' },
  { icon: '♚', title: 'home.features.endgames.title', body: 'home.features.endgames.body' },
  { icon: '♜', title: 'home.features.dashboard.title', body: 'home.features.dashboard.body' },
]

export default function App() {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:py-16">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span aria-hidden="true" className="mr-2">
              ♛
            </span>
            {t('app.title')}
          </h1>
          <p className="text-slate-300">{t('app.tagline')}</p>
        </header>

        <form
          className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="username" className="text-sm font-medium text-slate-300">
            {t('home.username.label')}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t('home.username.placeholder')}
              className="min-h-11 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-base outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled
              className="min-h-11 rounded-lg bg-emerald-600 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('home.username.submit')}
            </button>
          </div>
          <p className="text-xs text-slate-400">{t('home.username.comingSoon')}</p>
        </form>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t('home.features.title')}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <li
                key={feature.title}
                className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  {feature.icon}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-medium">{t(feature.title)}</h3>
                  <p className="text-sm text-slate-400">{t(feature.body)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <footer className="text-xs text-slate-500">
          {t('footer.license', { name: t('app.title') })}
        </footer>
      </main>
    </div>
  )
}
