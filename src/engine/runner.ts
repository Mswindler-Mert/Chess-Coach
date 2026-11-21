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
  /** Games still to analyse, including the one in progress. */
  remaining: number
  /** Increases with every saved analysis, so views know when to reload. */
  savedCount: number
  error: string | null
}

const INITIAL_STATE: RunnerState = {
  status: 'idle',
  username: null,
  current: null,
  completed: 0,
  remaining: 0,
  savedCount: 0,
  error: null,
}

/**
 * Analyses a user's games one at a time in the background, newest first, using only the
 * games matching the saved filter (tempos and date range). Each finished game is saved right away,
 * so pausing (or closing the tab) only loses the game in progress.
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
  /** Set by "Pause": automatic starts stay off until the user starts again. */
  private userPaused = false

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
    this.userPaused = false
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

  /**
   * Starts analysing without the user asking (after a sync, when the app opens) — unless the user
   * paused in this session or another user's games are being analysed.
   */
  autoStart(username: string): void {
    if (this.userPaused) return
    if (this.state.status === 'running' && this.state.username !== username) return
    this.start(username)
    this.userPaused = false
  }

  /** Stops after the current position; the game in progress is not saved. */
  pause(): void {
    this.userPaused = true
    this.generation++
    this.priorityId = undefined
    this.controller?.abort()
    if (this.state.status === 'running') this.set({ status: 'idle', current: null, remaining: 0 })
  }

  private async run(username: string, generation: number): Promise<void> {
    const isCurrent = () => generation === this.generation
    // The engine starts only once there is a game to analyse.
    let engine: UciEngine | null = null
    try {
      while (isCurrent()) {
        const [games, analyzed, filter, depth] = await Promise.all([
          listGames(username),
          analyzedGameIds(username),
          getGameFilter(),
          getAnalysisDepth(),
        ])
        if (!isCurrent()) return
        for (const id of this.skipped) analyzed.add(id)
        const queue = planAnalysisQueue(games, analyzed, filter, Date.now(), this.priorityId)
        const game = queue[0]
        this.set({ remaining: queue.length })
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
          engine ??= await getSharedEngine()
          const e = engine
          await e.newGame()
          const analysis = await analyzeGame(replay, (p) => e.evaluate(p, { depth }), {
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
      if (isCurrent()) this.set({ status: 'idle', current: null, remaining: 0 })
    } catch (error) {
      if (!isCurrent()) return
      resetSharedEngine()
      this.set({
        status: 'error',
        current: null,
        remaining: 0,
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
