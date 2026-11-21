import { useEffect, useState, type FormEvent } from 'react'
import { SITE_NAMES, SOURCES, sourceOf, type Source } from '../../core/api/source'
import { normalizeAccount } from '../../core/api/username'
import { getLastUsername, setLastUsername } from '../../db/games'
import { t, type MessageKey } from '../../i18n'
import { accountLabel } from '../format'
import { LanguageSwitch } from '../LanguageSwitch'
import { navigate, routeHref } from '../router'

const features: { icon: string; title: MessageKey; body: MessageKey }[] = [
  { icon: '♞', title: 'home.features.puzzles.title', body: 'home.features.puzzles.body' },
  { icon: '♝', title: 'home.features.openings.title', body: 'home.features.openings.body' },
  { icon: '♚', title: 'home.features.endgames.title', body: 'home.features.endgames.body' },
  { icon: '♜', title: 'home.features.dashboard.title', body: 'home.features.dashboard.body' },
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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="self-end">
          <LanguageSwitch />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span aria-hidden="true" className="mr-2">
            ♛
          </span>
          {t('app.title')}
        </h1>
        <p className="text-slate-300">{t('app.tagline')}</p>
      </header>

      <form
        noValidate
        className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4"
        onSubmit={onSubmit}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-slate-300">
            {t('home.site.label')}
          </legend>
          <div className="flex gap-2">
            {SOURCES.map((source) => (
              <button
                key={source}
                type="button"
                aria-pressed={site === source}
                onClick={() => {
                  setSite(source)
                  setInvalid(false)
                }}
                className={`min-h-10 rounded-full border px-4 text-sm font-medium ${
                  site === source
                    ? 'border-emerald-500 bg-emerald-600/20 text-emerald-200'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {SITE_NAMES[source]}
              </button>
            ))}
          </div>
        </fieldset>
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
            placeholder={t('home.username.placeholder')}
            className="min-h-11 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-base outline-none focus:border-emerald-500 aria-invalid:border-rose-500"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-500"
          >
            {t('home.username.submit')}
          </button>
        </div>
        {invalid && (
          <p id="username-error" className="text-sm text-rose-400">
            {t(`home.username.invalid.${site}`)}
          </p>
        )}
        {lastUsername && (
          <a
            href={routeHref({ name: 'games', username: lastUsername })}
            className="self-start text-sm text-emerald-400 underline-offset-2 hover:underline"
          >
            {t('home.continue', { username: accountLabel(lastUsername) })} →
          </a>
        )}
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
    </div>
  )
}
