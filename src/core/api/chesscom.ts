import type { ArchivesResponse, MonthResponse, RawGame } from './types'

const API_BASE = 'https://api.chess.com/pub'

export type ChessComErrorKind = 'not-found' | 'rate-limited' | 'network' | 'http'

export class ChessComError extends Error {
  readonly kind: ChessComErrorKind
  readonly status: number | undefined

  constructor(kind: ChessComErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'ChessComError'
    this.kind = kind
    this.status = status
  }
}

export interface HttpDeps {
  fetch: (url: string) => Promise<Response>
  sleep: (ms: number) => Promise<void>
}

export const defaultHttpDeps: HttpDeps = {
  fetch: (url) => globalThis.fetch(url),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}

/** How many times a 429 response is retried, and the first wait (doubles every retry). */
export const RATE_LIMIT_RETRIES = 3
export const RATE_LIMIT_BASE_DELAY_MS = 2000

export function archivesUrl(username: string): string {
  return `${API_BASE}/player/${encodeURIComponent(username)}/games/archives`
}

/** Fetches JSON, retrying on 429 with exponential backoff. Never runs requests in parallel. */
export async function fetchJson<T>(url: string, deps: HttpDeps): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let response: Response
    try {
      response = await deps.fetch(url)
    } catch (error) {
      throw new ChessComError('network', `Network error for ${url}: ${String(error)}`)
    }

    if (response.ok) return (await response.json()) as T

    if (response.status === 429) {
      if (attempt >= RATE_LIMIT_RETRIES) {
        throw new ChessComError('rate-limited', `Rate limited: ${url}`, 429)
      }
      await deps.sleep(RATE_LIMIT_BASE_DELAY_MS * 2 ** attempt)
      continue
    }

    if (response.status === 404) {
      throw new ChessComError('not-found', `Not found: ${url}`, 404)
    }
    throw new ChessComError('http', `HTTP ${response.status}: ${url}`, response.status)
  }
}

export async function fetchArchives(username: string, deps: HttpDeps): Promise<string[]> {
  const data = await fetchJson<ArchivesResponse>(archivesUrl(username), deps)
  return data.archives
}

export async function fetchMonth(archiveUrl: string, deps: HttpDeps): Promise<RawGame[]> {
  const data = await fetchJson<MonthResponse>(archiveUrl, deps)
  return data.games
}
