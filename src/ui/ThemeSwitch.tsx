import { t } from '../i18n'
import { setTheme, THEMES, useTheme } from './theme'

/** Two-tone split-circle theme picker inspired by tactile desktop dashboards. */
export function ThemeSwitch({ showLabel = false }: { showLabel?: boolean }) {
  const active = useTheme()
  return (
    <div
      role="group"
      aria-label={t('nav.theme')}
      className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-2.5 py-1.5"
    >
      {showLabel && (
        <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          {t(`theme.short.${active}`)}
        </span>
      )}
      <div className="flex items-center gap-1.5">
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
              className={`size-5 rounded-full border border-slate-600/80 transition-transform ${
                selected
                  ? 'scale-110 ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950'
                  : 'opacity-75 hover:scale-105 hover:opacity-100'
              }`}
              style={{
                background: `linear-gradient(135deg, ${theme.swatchBg} 48%, ${theme.swatchAccent} 52%)`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
