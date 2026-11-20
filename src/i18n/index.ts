import { tr, type MessageKey } from './tr'

export type { MessageKey }

export type MessageParams = Record<string, string | number>

/** True when `key` exists, for keys built at runtime (e.g. from Chess.com result codes). */
export function hasMessage(key: string): key is MessageKey {
  return Object.hasOwn(tr, key)
}

/**
 * Returns the UI string for `key`, replacing `{name}`-style placeholders with `params`.
 * Placeholders without a matching param are left as-is so missing values are visible.
 */
export function t(key: MessageKey, params?: MessageParams): string {
  const template: string = tr[key]
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}
