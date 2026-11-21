import { useEffect, useState, type FormEvent } from 'react'
import { SITE_NAMES, SOURCES, sourceOf, type Source } from '../../core/api/source'
import { normalizeAccount } from '../../core/api/username'
import { getLastUsername, setLastUsername } from '../../db/games'
import { t, type MessageKey } from '../../i18n'
import { accountLabel } from '../format'
import { LanguageSwitch } from '../LanguageSwitch'
import { navigate, routeHref } from '../router'

const features: { icon: string; tone: string; title: MessageKey; body: MessageKey }[] = [
  {
    icon: '♞',
    tone: 'bg-emerald-500/15 text-emerald-300',
    title: 'home.features.puzzles.title',
    body: 'home.features.puzzles.body',
  },
  {
    icon: '🎯',
    tone: 'bg-rose-500/15 text-rose-300',
    title: 'home.features.hanging.title',
    body: 'home.features.hanging.body',
  },
  {
    icon: '🔥',
    tone: 'bg-amber-500/15 text-amber-300',
    title: 'home.features.daily.title',
    body: 'home.features.daily.body',
  },
  {
    icon: '♝',
    tone: 'bg-sky-500/15 text-sky-300',
    title: 'home.features.openings.title',
    body: 'home.features.openings.body',
  },
  {
    icon: '♚',
    tone: 'bg-violet-500/15 text-violet-300',
    title: 'home.features.endgames.title',
    body: 'home.features.endgames.body',
  },
  {
    icon: '♜',
    tone: 'bg-teal-500/15 text-teal-300',
    title: 'home.features.dashboard.title',
    body: 'home.features.dashboard.body',
  },
]

export function HomePage() {
  const [input, setInput] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [lastUsername, setLast] = useState<string | null>(null)
  const [site, setSite] = useState<Source>('chesscom')

  useEffect(() => {
    getLastUsername().then(
      (last) => {
        setLast(last)
        // Start on the site the user used last time.
        if (last) setSite(sourceOf(last))
      },
      () => setLast(null),
    )
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const username = normalizeAccount(site, input)
    if (!username) {
      setInvalid(true)
      return
    }
    await setLastUsername(username)
    navigate({ name: 'games', username })
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-b from-emerald-950/35 via-slate-900/90 to-slate-900 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl"
        />

        <div className="relative flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              {t('home.badge')}
            </span>
            <LanguageSwitch />
          </div>

          <header className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-lg shadow-emerald-950/60"
              >
                ♞
              </span>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t('app.title')}
              </h1>
            </div>
            <p className="max-w-2xl text-base text-slate-300 sm:text-lg">{t('app.tagline')}</p>
          </header>

          <form
            noValidate
            className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5"
            onSubmit={onSubmit}
          >
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
                {t('home.site.label')}
              </legend>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-1">
                {SOURCES.map((source) => (
                  <button
                    key={source}
                    type="button"
                    aria-pressed={site === source}
                    onClick={() => {
                      setSite(source)
                      setInvalid(false)
                    }}
                    className={`min-h-10 rounded-lg text-sm font-semibold transition-colors ${
                      site === source
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {SITE_NAMES[source]}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-1.5">
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
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    setInvalid(false)
                  }}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? 'username-error' : undefined}
                  placeholder={t(`home.username.placeholder.${site}`)}
                  className="min-h-11 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-base text-white placeholder:text-slate-500 outline-none transition-colors focus:border-emerald-500 aria-invalid:border-rose-500"
                />
                <button
                  type="submit"
                  className="min-h-11 rounded-xl bg-emerald-600 px-5 font-semibold text-white shadow-sm shadow-emerald-950/50 transition-colors hover:bg-emerald-500"
                >
                  {t('home.username.submit')}
                </button>
              </div>
              {invalid && (
                <p id="username-error" className="text-sm text-rose-400">
                  {t(`home.username.invalid.${site}`)}
                </p>
              )}
            </div>

            {lastUsername && (
              <a
                href={routeHref({ name: 'games', username: lastUsername })}
                className="group flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/15"
              >
                <span>{t('home.continue', { username: accountLabel(lastUsername) })}</span>
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </a>
            )}
          </form>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-100">
          {t('home.features.title')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="flex flex-col gap-2.5 rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4 transition-colors hover:border-slate-700"
            >
              <span
                aria-hidden="true"
                className={`grid size-10 place-items-center rounded-xl text-xl leading-none ${feature.tone}`}
              >
                {feature.icon}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-slate-100">{t(feature.title)}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{t(feature.body)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
