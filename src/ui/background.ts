import { getAutoAnalyze } from '../db/analyses'
import { getLastUsername, syncUserGames } from '../db/games'
import { analysisRunner } from '../engine/runner'

let started = false

/**
 * Once per app start: fetch new games of the user on screen (or the last user) and analyse them
 * in the background, if automatic analysis is on. Offline, it analyses what is already stored.
 */
export function startBackgroundWork(routeUsername: string | null): void {
  if (started) return
  started = true
  void (async () => {
    const username = routeUsername ?? (await getLastUsername())
    if (!username || !(await getAutoAnalyze())) return
    try {
      await syncUserGames(username)
    } catch {
      // No connection or Chess.com trouble: the stored games can still be analysed.
    }
    analysisRunner.autoStart(username)
  })()
}

/** After a sync on the game list: analyse the new games if automatic analysis is on. */
export async function autoAnalyzeAfterSync(username: string): Promise<void> {
  if (await getAutoAnalyze()) analysisRunner.autoStart(username)
}
