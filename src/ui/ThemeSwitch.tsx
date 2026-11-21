import { t } from '../i18n'
import { setTheme, THEMES, useTheme } from './theme'

/** Compact palette switcher with colour dots (Walnut, Forest, Obsidian). */
export function ThemeSwitch() {
  const active = useTheme()
  return (
    <div
      role="group"
      aria-label={t('nav.theme')}
      className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/90 p-1"
    >
      {THEMES.map((theme) => {
        const selected = active === theme.id
        const label = t(`theme.${theme.id}`)
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => setTheme(theme.id)}
            aria-pressed={selected}
            aria-label={label}
            title={label}
            className={`grid size-6 place-items-center rounded-full transition-transform ${
              selected ? 'scale-105 ring-2 ring-emerald-400/90' : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: theme.swatchBg }}
          >
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: theme.swatchAccent }}
            />
          </button>
        )
      })}
    </div>
  )
}
