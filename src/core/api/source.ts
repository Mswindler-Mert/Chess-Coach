/** Where a user's games come from. */
export type Source = 'chesscom' | 'lichess'
export const SOURCES: readonly Source[] = ['chesscom', 'lichess']

export const SITE_NAMES: Record<Source, string> = { chesscom: 'Chess.com', lichess: 'Lichess' }

/**
 * Accounts are stored and routed under one key: plain for Chess.com ("hikaru"), prefixed for
 * Lichess ("lichess:drnykterstein"). Chess.com names cannot contain ":", so keys never clash.
 */
export const LICHESS_PREFIX = 'lichess:'

/** Lichess game ids are stored with this prefix (Chess.com uuids are hex and never start so). */
export const LICHESS_GAME_PREFIX = 'li-'

export function sourceOf(account: string): Source {
  return account.startsWith(LICHESS_PREFIX) ? 'lichess' : 'chesscom'
}

/** The name as the user typed it on the site, without the source prefix. */
export function accountName(account: string): string {
  return sourceOf(account) === 'lichess' ? account.slice(LICHESS_PREFIX.length) : account
}

export function accountKey(source: Source, name: string): string {
  return source === 'lichess' ? `${LICHESS_PREFIX}${name}` : name
}

export function gameSource(gameId: string): Source {
  return gameId.startsWith(LICHESS_GAME_PREFIX) ? 'lichess' : 'chesscom'
}
