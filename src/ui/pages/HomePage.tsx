import { useEffect, useState, type FormEvent } from 'react'
import { Chessboard } from 'react-chessboard'
import { SITE_NAMES, SOURCES, sourceOf, type Source } from '../../core/api/source'
import { normalizeAccount } from '../../core/api/username'
import { getLastUsername, setLastUsername } from '../../db/games'
import { t, type MessageKey } from '../../i18n'
import { accountLabel } from '../format'
import { LanguageSwitch } from '../LanguageSwitch'
import { navigate, routeHref } from '../router'
import { useBoardColors } from '../theme'
import { ThemeSwitch } from '../ThemeSwitch'

const ITALIAN_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'

const features: { num: string; title: MessageKey; body: MessageKey }[] = [
  { num: '01', title: 'home.features.puzzles.title', body: 'home.features.puzzles.body' },
  { num: '02', title: 'home.features.hanging.title', body: 'home.features.hanging.body' },
  { num: '03', title: 'home.features.openings.title', body: 'home.features.openings.body' },
  { num: '04', title: 'home.features.daily.title', body: 'home.features.daily.body' },
  { num: '05', title: 'home.features.endgames.title', body: 'home.features.endgames.body' },
  { num: '06', title: 'home.features.dashboard.title', body: 'home.features.dashboard.body' },
]

export function HomePage() {
  const [input, setInput] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [lastUsername, setLast] = useState<string | null>(null)
  const [site, setSite] = useState<Source>('chesscom')
  const boardColors = useBoardColors()

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
    <div className="flex flex-col gap-14">
      {/* Top utility bar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-md border border-emerald-500/40 bg-emerald-600/15 text-base text-emerald-300"
          >
            ♞
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-slate-100">
            {t('app.title')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
      </div>

      {/* Editorial asymmetric hero: typography + form on the left, real tactile chessboard on the right */}
      <section className="grid items-center gap-10 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <p className="text-xs font-medium tracking-[0.14em] text-emerald-400 uppercase">
            {t('home.badge')}
          </p>

          <header className="flex flex-col gap-3">
            <h1 className="font-display text-4xl leading-[1.08] font-semibold tracking-tight text-slate-100 sm:text-5xl">
              {t('app.title')}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {t('app.tagline')}
            </p>
          </header>

          <form noValidate className="flex max-w-lg flex-col gap-4 pt-1" onSubmit={onSubmit}>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-xs font-medium tracking-wider text-slate-400 uppercase">
                {t('home.site.label')}
              </legend>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
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
                        ? 'bg-emerald-600 text-slate-950 shadow-sm'
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
                  className="min-h-12 flex-1 rounded-xl border border-slate-700/90 bg-slate-900/90 px-4 text-base text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-emerald-500 aria-invalid:border-rose-500"
                />
                <button
                  type="submit"
                  className="min-h-12 rounded-xl bg-emerald-600 px-6 font-semibold text-slate-950 transition-colors hover:bg-emerald-500"
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
                className="group flex items-center justify-between border-t border-slate-800/80 pt-3 text-sm font-medium text-emerald-300 transition-colors hover:text-emerald-200"
              >
                <span>{t('home.continue', { username: accountLabel(lastUsername) })}</span>
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </a>
            )}
          </form>
        </div>

        {/* Tactile Chessboard Showcase */}
        <figure className="flex flex-col gap-3 lg:col-span-5">
          <div className="club-board-frame mx-auto w-full max-w-[360px]">
            <div className="aspect-square w-full overflow-hidden rounded-[6px] select-none">
              <Chessboard
                options={{
                  id: 'home-showcase-board',
                  position: ITALIAN_FEN,
                  boardOrientation: 'white',
                  allowDragging: false,
                  allowDrawingArrows: false,
                  arrows: [
                    {
                      startSquare: 'c4',
                      endSquare: 'f7',
                      color: 'rgba(207, 160, 87, 0.85)',
                    },
                  ],
                  squareStyles: {
                    f1: { backgroundColor: 'rgba(207, 160, 87, 0.25)' },
                    c4: { backgroundColor: 'rgba(207, 160, 87, 0.35)' },
                  },
                  ...boardColors,
                }}
              />
            </div>
          </div>
          <figcaption className="mx-auto flex max-w-[360px] flex-col gap-1 text-center lg:text-left">
            <span className="font-mono text-xs text-emerald-300/90">
              {t('home.showcase.caption')}
            </span>
            <span className="text-xs leading-relaxed text-slate-400">
              {t('home.showcase.note')}
            </span>
          </figcaption>
        </figure>
      </section>

      {/* Editorial ruled index instead of generic identical boxes */}
      <section className="flex flex-col gap-6 border-t border-slate-800/80 pt-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-100">
          {t('home.features.title')}
        </h2>
        <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="flex flex-col gap-2 border-t border-slate-800/70 pt-4"
            >
              <span className="font-mono text-xs text-emerald-400/90">{feature.num}</span>
              <h3 className="font-display text-lg font-semibold text-slate-100">
                {t(feature.title)}
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">{t(feature.body)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
