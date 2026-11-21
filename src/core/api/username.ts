import { accountKey, LICHESS_PREFIX, type Source } from './source'

// Chess.com usernames: 3–25 characters, letters, digits, underscore and hyphen.
const CHESSCOM_PATTERN = /^[a-z0-9_-]{3,25}$/
// Lichess usernames: 2–30 characters, letters, digits, underscore and hyphen, starting alphanumeric.
const LICHESS_PATTERN = /^[a-z0-9][a-z0-9_-]{1,29}$/

/**
 * Trims and lowercases a username typed for `source` and returns the account key
 * (see `accountKey`), or null when it cannot be a valid username on that site — so the UI can
 * reject it before making any request.
 */
export function normalizeAccount(source: Source, input: string): string | null {
  const name = input.trim().toLowerCase()
  const pattern = source === 'lichess' ? LICHESS_PATTERN : CHESSCOM_PATTERN
  return pattern.test(name) ? accountKey(source, name) : null
}

/**
 * Normalises an account key from a route or storage: "hikaru" (Chess.com) or "lichess:name".
 * Returns null when it is not a valid account.
 */
export function normalizeUsername(input: string): string | null {
  const key = input.trim().toLowerCase()
  return key.startsWith(LICHESS_PREFIX)
    ? normalizeAccount('lichess', key.slice(LICHESS_PREFIX.length))
    : normalizeAccount('chesscom', key)
}
