import { analyzeGame } from '../core/analysis/analyzeGame'
import { planAnalysisQueue } from '../core/analysis/queue'
import { buildReplay, type Replay } from '../core/games/replay'
import {
  ANALYSIS_VERSION,
  analyzedGameIds,
  ENGINE_NAME,
  getAnalysisDepth,
  saveAnalysis,
} from '../db/analyses'
import { getGameFilter, listGames } from '../db/games'
import type { UciEngine } from './engine'
import { getSharedEngine, resetSharedEngine } from './shared'

export interface RunnerState {
  status: 'idle' | 'running' | 'error'
  username: string | null
  /** The game being analysed and how many of its positions are done. */
  current: { gameId: string; done: number; total: number } | null
  /** Games analysed since the last start. */
  completed: number
  /** Increases with every saved analysis, so views know when to reload. */
  savedCount: number
  error: string | null
}

const INITIAL_STATE: RunnerState = {
  status: 'idle',
  username: null,
  current: null,
  completed: 0,
  savedCount: 0,
  error: null,
}

/**
 * Analyses a user's games one at a time in the background, newest first, using only the
 * games matching the saved filter (tempos and date range). Each finished game is saved right away, so pausing (or closing
 * the tab) only loses the game in progress.
 */
export class AnalysisRunner {
  private state: RunnerState = INITIAL_STATE
  private readonly listeners = new Set<() => void>()
  private controller: AbortController | null = null
  private priorityId: string | undefined
  /** Bumped on every start/pause; a loop from an older generation stops by itself. */
  private generation = 0
  /** Games whose PGN could not be replayed; skipped until the page reloads. */
  private readonly skipped = new Set<string>()

  getState = (): RunnerState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Calls `listener` after each saved analysis. Returns an unsubscribe function. */
  onSaved = (listener: () => void): (() => void) => {
    let seen = this.state.savedCount
    return this.subscribe(() => {
      if (this.state.savedCount === seen) return
      seen = this.state.savedCount
      listener()
    })
  }

  /** Starts (or keeps) analysing `username`'s games. `priorityId` is analysed first. */
  start(username: string, priorityId?: string): void {
    if (priorityId) this.priorityId = priorityId
    if (this.state.status === 'running' && this.state.username === username) {
      // Drop the game in progress so the requested one starts now.
      if (priorityId && this.state.current?.gameId !== priorityId) this.controller?.abort()
      return
    }
    this.controller?.abort()
    const generation = ++this.generation
    this.set({ status: 'running', username, current: null, completed: 0, error: null })
    void this.run(username, generation)
  }

  /** Stops after the current position; the game in progress is not saved. */
  pause(): void {
    this.generation++
    this.priorityId = undefined
    this.controller?.abort()
    if (this.state.status === 'running') this.set({ status: 'idle', current: null })
  }

  private async run(username: string, generation: number): Promise<void> {
    const isCurrent = () => generation === this.generation
    try {
      const engine: UciEngine = await getSharedEngine()
      while (isCurrent()) {
        const [games, analyzed, filter, depth] = await Promise.all([
          listGames(username),
          analyzedGameIds(username),
          getGameFilter(),
          getAnalysisDepth(),
        ])
        if (!isCurrent()) return
        for (const id of this.skipped) analyzed.add(id)
        const game = planAnalysisQueue(games, analyzed, filter, Date.now(), this.priorityId)[0]
        if (!game) break
        if (game.id === this.priorityId) this.priorityId = undefined

        let replay: Replay
        try {
          replay = buildReplay(game.pgn)
        } catch {
          this.skipped.add(game.id)
          continue
        }

        const controller = new AbortController()
        this.controller = controller
        const total = replay.moves.length + 1
        this.set({ current: { gameId: game.id, done: 0, total } })
        try {
          await engine.newGame()
          const analysis = await analyzeGame(replay, (p) => engine.evaluate(p, { depth }), {
            signal: controller.signal,
            onProgress: (done) => {
              if (isCurrent()) this.set({ current: { gameId: game.id, done, total } })
            },
          })
          await saveAnalysis({
            ...analysis,
            gameId: game.id,
            username,
            analyzedAt: Date.now(),
            engine: ENGINE_NAME,
            depth,
            version: ANALYSIS_VERSION,
          })
          this.set({ completed: this.state.completed + 1, savedCount: this.state.savedCount + 1 })
        } catch (error) {
          // Aborted: either paused (the loop ends) or switched to a priority game (it goes on).
          if (controller.signal.aborted) continue
          throw error
        }
      }
      if (isCurrent()) this.set({ status: 'idle', current: null })
    } catch (error) {
      if (!isCurrent()) return
      resetSharedEngine()
      this.set({
        status: 'error',
        current: null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private set(patch: Partial<RunnerState>): void {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener())
  }
}

export const analysisRunner = new AnalysisRunner()
