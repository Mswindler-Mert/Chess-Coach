import { getLanguage, setLanguage, t, type Language } from '../i18n'

const NAMES: Record<Language, string> = { tr: 'Türkçe', en: 'English' }

/** Shows the other language; picking it saves the choice and reloads in that language. */
export function LanguageSwitch() {
  const other: Language = getLanguage() === 'tr' ? 'en' : 'tr'
  return (
    <button
      type="button"
      lang={other}
      title={`${t('nav.language')}: ${NAMES[other]}`}
      onClick={() => {
        setLanguage(other)
        window.location.reload()
      }}
      className="min-h-9 rounded-md border border-slate-700 px-2 text-sm text-slate-300 hover:border-slate-500 hover:text-slate-100"
    >
      {NAMES[other]}
    </button>
  )
}
