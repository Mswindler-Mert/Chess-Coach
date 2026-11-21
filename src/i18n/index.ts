import { en } from './en'
import { tr, type MessageKey } from './tr'

export type { MessageKey }

export type MessageParams = Record<string, string | number>

export type Language = 'tr' | 'en'
export const LANGUAGES: readonly Language[] = ['tr', 'en']

const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { tr, en }
const LOCALES: Record<Language, string> = { tr: 'tr-TR', en: 'en-GB' }
const PLURAL_RULES: Record<Language, Intl.PluralRules> = {
  tr: new Intl.PluralRules(LOCALES.tr),
  en: new Intl.PluralRules(LOCALES.en),
}
const STORAGE_KEY = 'chess-coach:language'

/** Turkish unless the viewer picked English before (a per-device choice). */
function savedLanguage(): Language {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY)
    return value === 'en' || value === 'tr' ? value : 'tr'
  } catch {
    return 'tr' // storage blocked
  }
}

let current: Language = savedLanguage()

export function getLanguage(): Language {
  return current
}

/** Switches the language and remembers it. The UI reloads afterwards to re-render everything. */
export function setLanguage(language: Language): void {
  current = language
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, language)
  } catch {
    // Not saved; still applies until the page reloads.
  }
}

/** BCP 47 locale for dates and numbers in the current language. */
export function locale(): string {
  return LOCALES[current]
}

/** "%45" in Turkish, "45%" in English. */
export function formatPercent(share: number): string {
  return new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 0 }).format(
    share,
  )
}

export function formatNumber(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString(locale(), { maximumFractionDigits })
}

/** True when `key` exists, for keys built at runtime (e.g. from Chess.com result codes). */
export function hasMessage(key: string): key is MessageKey {
  return Object.hasOwn(tr, key)
}

/**
 * Returns the UI string for `key` in the current language, replacing `{name}` placeholders and
 * `{name|one|other}` plural forms (using `Intl.PluralRules` for the active locale; `#` inside a
 * branch expands to the value). Placeholders without a matching param are left as-is so missing
 * values are visible.
 */
export function t(key: MessageKey, params?: MessageParams): string {
  const template: string = DICTIONARIES[current][key]
  if (!params) return template
  return template.replace(
    /\{(\w+)(?:\|([^|{}]*)\|([^{}]*))?\}/g,
    (match, name: string, one: string | undefined, other: string | undefined) => {
      const value = params[name]
      if (value === undefined) return match
      if (one !== undefined && other !== undefined) {
        const num = typeof value === 'number' ? value : Number(value)
        const chosen =
          Number.isFinite(num) && PLURAL_RULES[current].select(num) === 'one' ? one : other
        return chosen.replace(/#/g, String(value))
      }
      return String(value)
    },
  )
}
